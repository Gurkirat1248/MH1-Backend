import { Injectable } from '@nestjs/common';
import { getImageUrl } from 'src/common/utils/helper.utils';
import { GraphQLClientService } from 'src/utils/graphql/graphql.service';
import { GetNewsCardRaw } from './news-cards.interface';
import { GET_NEWS_CARDS } from './news-cards.queries';
import { DayjsService } from 'src/utils/dayjs/dayjs.service';

@Injectable()
export class NewsCardsService {
  constructor(
    private readonly graphqlClient: GraphQLClientService,
    private readonly dayjsService: DayjsService,
  ) {}

  async parseNewsCards(rawData: GetNewsCardRaw) {
    return rawData.newsCards.data.map((card) => {
      const attributes = card.attributes;
      return {
        id: card.id,
        title: attributes.title,
        date: attributes.date,
        header:
          attributes?.date === this.dayjsService.getCurrentDate()
            ? 'Today’s Highlights'
            : '',
        bgImageUrl: getImageUrl(attributes.bgImage.data?.attributes.url),
        content: attributes.content,
        duration: attributes.duration,
        sourceLink: attributes.externalUrl,
      };
    });
  }

  async fetchNewsCards() {
    try {
      const rawData: GetNewsCardRaw = await this.graphqlClient.query(
        GET_NEWS_CARDS,
        {},
      );
      return this.parseNewsCards(rawData);
    } catch (error) {
      throw error;
    }
  }
}
