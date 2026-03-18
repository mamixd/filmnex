// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  async addFavorite(userId: string, contentId: string, contentType: string) {
    const key = `${contentType}:${contentId}`;
    await this.userModel.updateOne(
      { _id: userId },
      { $addToSet: { favorites: key } },
    );
    return { added: true };
  }

  async removeFavorite(userId: string, contentId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { favorites: { $regex: contentId } } },
    );
    return { removed: true };
  }

  async getFavorites(userId: string) {
    const user = await this.userModel.findById(userId).select('favorites');
    return user?.favorites || [];
  }

  async saveWatchHistory(
    userId: string,
    contentId: string,
    contentType: string,
    progress: number,
    duration: number,
  ) {
    await this.userModel.updateOne(
      { _id: userId, 'watchHistory.contentId': contentId },
      {
        $set: {
          'watchHistory.$.progress': progress,
          'watchHistory.$.duration': duration,
          'watchHistory.$.updatedAt': new Date(),
        },
      },
    );

    // If document wasn't matched (new entry), push it
    const user = await this.userModel.findOne({
      _id: userId,
      'watchHistory.contentId': contentId,
    });

    if (!user) {
      await this.userModel.updateOne(
        { _id: userId },
        {
          $push: {
            watchHistory: {
              $each: [{ contentId, contentType, progress, duration, updatedAt: new Date() }],
              $position: 0,
              $slice: 100, // Keep last 100 items
            },
          },
        },
      );
    }

    return { saved: true };
  }

  async getWatchHistory(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('watchHistory')
      .lean();
    return user?.watchHistory || [];
  }

  async updateProfile(userId: string, dto: { username?: string; avatar?: string; preferences?: any }) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: dto },
      { new: true },
    ).select('-password');
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return user;
  }

  async rateContent(userId: string, contentId: string, contentType: string, rating: number) {
    // TODO: Implement content rating
    return { rated: true, rating };
  }
}

// ─────────────────────────────────────────────────────
// src/modules/users/users.controller.ts
import {
  Controller, Get, Post, Delete, Put, Body, Param,
  UseGuards, Request
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('favorites')
  addFavorite(@Request() req: any, @Body() body: { contentId: string; contentType: string }) {
    return this.usersService.addFavorite(req.user.id, body.contentId, body.contentType);
  }

  @Delete('favorites/:contentId')
  removeFavorite(@Request() req: any, @Param('contentId') contentId: string) {
    return this.usersService.removeFavorite(req.user.id, contentId);
  }

  @Get('favorites')
  getFavorites(@Request() req: any) {
    return this.usersService.getFavorites(req.user.id);
  }

  @Post('watch-history')
  saveWatchHistory(
    @Request() req: any,
    @Body() body: { contentId: string; contentType: string; progress: number; duration: number },
  ) {
    return this.usersService.saveWatchHistory(
      req.user.id, body.contentId, body.contentType, body.progress, body.duration,
    );
  }

  @Get('watch-history')
  getWatchHistory(@Request() req: any) {
    return this.usersService.getWatchHistory(req.user.id);
  }

  @Put('profile')
  updateProfile(@Request() req: any, @Body() body: any) {
    return this.usersService.updateProfile(req.user.id, body);
  }
}
