import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GraphQLClientService } from 'src/utils/graphql/graphql.service';
import {
  FITNESS_ACTIVITIES,
  MIND_ACTIVITIES,
  PREGNANCY_COACH,
} from './activities.query';
import {
  Button,
  ConsentForm,
  Doctor,
  FitnessActivitiesRaw,
  GetPregnancyCoachRaw,
  MindActivitiesOverview,
  MindActivitiesRaw,
  ParsedConsentForm,
  ParsedDoctor,
  ParsedFitnessActivity,
} from './activities.interface';
import { getImageUrl } from 'src/common/utils/helper.utils';
import { pregnancyCoachOverview } from 'src/common/content/activity.content';

@Injectable()
export class ActivitiesService {
  constructor(private readonly graphqlClient: GraphQLClientService) {}

  private parseMindActivities(
    rawData: MindActivitiesRaw,
  ): MindActivitiesOverview {
    const { heading, subHeading, mind_activities } =
      rawData.mindActivitiesOverview.data.attributes;

    const parsedData: MindActivitiesOverview = {
      heading: heading || '',
      subHeading: subHeading || '',
      mindActivities: mind_activities.data.map((activity) => ({
        name: activity.attributes.name || '',
        duration: activity.attributes.duration || '',
        benefits: activity.attributes.benefits || '',
        thumbnail: getImageUrl(
          activity.attributes.thumbnail?.data?.attributes?.url,
        ),
        description: activity.attributes.description || '',
        videoUrl: activity.attributes.videoUrl || '',
      })),
    };

    return parsedData;
  }

  async fetchMindActivities() {
    try {
      const mindActivitiesRaw: MindActivitiesRaw =
        await this.graphqlClient.query(MIND_ACTIVITIES, {});

      const parsedMindActivityOverview: MindActivitiesOverview =
        this.parseMindActivities(mindActivitiesRaw);
      return parsedMindActivityOverview;
    } catch (error) {
      throw error;
    }
  }
  private parseFitnessActivities(response: FitnessActivitiesRaw): {
    activities: ParsedFitnessActivity[];
    consentForm: ParsedConsentForm;
  } {
    let consentForm;
    const activities = response.fitnessActivities?.data
      ?.map((item) => {
        const attrs = item?.attributes;
        if (!attrs) return null;
        consentForm = this.parseConsentForm(
          attrs.consent_form?.data?.attributes,
        );
        return {
          week: attrs.week ?? 0,
          name: attrs.name ?? '',
          videoUrl: attrs.videoUrl ?? '',
          thumbnailUrl: getImageUrl(attrs.thumbnail?.data?.attributes?.url),
          subHeading: attrs.subHeading ?? '',
          description: {
            benefits: attrs.description?.benefits ?? '',
            precautions: attrs.description?.precautions ?? '',
          },
        };
      })
      .filter(
        (activity): activity is NonNullable<typeof activity> =>
          activity !== null,
      );

    return {
      activities:
        activities.sort(
          (activity1, activity2) => activity1.week - activity2.week,
        ) ?? [],
      consentForm,
    };
  }

  private parseConsentForm(consentForm?: ConsentForm): ParsedConsentForm {
    return {
      weekConfirmation: {
        heading: consentForm?.weekConfirmation?.heading ?? '',
        subHeading1: consentForm?.weekConfirmation?.subHeading1 ?? '',
        subHeading2: consentForm?.weekConfirmation?.subHeading2 ?? '',
        button: this.parseButton(consentForm?.weekConfirmation?.button),
      },
      docInfo: {
        heading: consentForm?.docInfo?.heading ?? '',
        subHeading: consentForm?.docInfo?.subHeading ?? '',
        doctor: this.parseDoctorInfo(
          consentForm?.docInfo?.hms_doctor?.data?.attributes,
        ),
        button: this.parseButton(consentForm?.docInfo?.button),
      },
      consentForm: {
        heading: consentForm?.consentForm?.heading ?? '',
        subHeading: consentForm?.consentForm?.subHeading ?? '',
        consentText: consentForm?.consentForm?.consentText ?? '',
        button: this.parseButton(consentForm?.consentForm?.button),
      },
      disclaimer:
        consentForm?.disclaimer?.map((disclaimer: any) => {
          return {
            heading: disclaimer?.heading ?? '',
            heading2: disclaimer?.heading2 ?? '',
            subHeading: disclaimer?.subHeading ?? '',
            button: this.parseButton(disclaimer?.button),
          };
        }) ?? [],
      unlockActivityCard: {
        heading: consentForm?.unlockActivityCard?.heading ?? '',
        subHeading: consentForm?.unlockActivityCard?.subHeading ?? '',
        button: this.parseButton(consentForm?.unlockActivityCard?.button),
      },
    };
  }

  private parseDoctorInfo(doctor?: Doctor): ParsedDoctor {
    return {
      name: doctor?.name ?? '',
      imageUrl: getImageUrl(doctor?.image?.data?.attributes?.url),
      specialty: doctor?.specialty?.data?.attributes?.name ?? '',
      experienceYears: doctor?.experienceYears ?? 0,
    };
  }

  private parseButton(button?: Button) {
    return {
      btnText: button?.btnText ?? '',
      bgColor: button?.bgColor ?? '',
      textColor: button?.textColor ?? '',
    };
  }

  async fetchFitnessActivities(weekNumber: number) {
    try {
      const fitnessActivityRaw: FitnessActivitiesRaw =
        await this.graphqlClient.query(FITNESS_ACTIVITIES, {
          weekNumber: weekNumber,
        });

      return this.parseFitnessActivities(fitnessActivityRaw);
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  private parsePregnancyCoachData(coachDataRaw: GetPregnancyCoachRaw) {
    const ParsedDoctor = this.parseDoctorInfo(
      coachDataRaw.activities.data[0]?.attributes?.hms_doctor?.data?.attributes,
    );

    const data = coachDataRaw.activities.data[0]?.attributes;
    const staticContent = pregnancyCoachOverview();

    const soulActivityCard = data.activityCardDynamic.filter((activity) => {
      return activity.activityType === 'Soul';
    });

    const parsedSoulActivity = {
      label: {
        text: soulActivityCard[0]?.label?.text,
        bgColor: soulActivityCard[0]?.label?.backgroundColor,
      },
      heading: soulActivityCard[0]?.title,
      image: getImageUrl(soulActivityCard[0]?.image?.data?.attributes?.url),
    };

    const parsedActivityOverview = {
      weekNumber: data.week,
      docInfo: ParsedDoctor,
      divider: staticContent.divider,
      activities: [
        staticContent.waterActivityCard,
        staticContent.nutritionCard,
        parsedSoulActivity,
        staticContent.mindCard,
        staticContent.fitnessCard,
      ],
    };
    return parsedActivityOverview;
  }

  async fetchPersonalCoach(weekNumber: number) {
    try {
      const coachDataRaw: GetPregnancyCoachRaw = await this.graphqlClient.query(
        PREGNANCY_COACH,
        {
          weekNumber: weekNumber,
        },
      );

      console.log(coachDataRaw);

      if (!coachDataRaw.activities?.data)
        throw new HttpException('No Data Available', HttpStatus.NOT_FOUND);

      const parsedData = this.parsePregnancyCoachData(coachDataRaw);
      return parsedData;
    } catch (error) {
      console.log(error);

      throw error;
    }
  }
}
