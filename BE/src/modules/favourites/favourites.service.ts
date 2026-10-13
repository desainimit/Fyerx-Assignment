import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import type { ApiResult, FavouritesDto } from '@dtos';
import { CategoryModel, UserFavouriteCategoryModel } from '@models';

@Injectable()
export class FavouritesService {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async list(userId: string): Promise<ApiResult<FavouritesDto>> {
    return { message: 'Favourite categories', data: await this.codes(userId) };
  }

  // Replaces the whole set in one transaction, so a failure never leaves
  // the user with half of their old choices and half of their new ones.
  async replace(
    userId: string,
    { categories }: FavouritesDto,
  ): Promise<ApiResult<FavouritesDto>> {
    const known = await CategoryModel.count({ where: { code: categories } });
    if (known !== categories.length) {
      throw new BadRequestException('Unknown category');
    }
    await this.sequelize.transaction(async (transaction) => {
      await UserFavouriteCategoryModel.destroy({
        where: { userId },
        transaction,
      });
      await UserFavouriteCategoryModel.bulkCreate(
        categories.map((categoryCode) => ({ userId, categoryCode })),
        { transaction },
      );
    });
    return { message: 'Favourites saved', data: await this.codes(userId) };
  }

  private async codes(userId: string): Promise<FavouritesDto> {
    const rows = await UserFavouriteCategoryModel.findAll({
      where: { userId },
      attributes: ['categoryCode'],
      order: [['categoryCode', 'ASC']],
    });
    return { categories: rows.map((row) => row.categoryCode) };
  }
}
