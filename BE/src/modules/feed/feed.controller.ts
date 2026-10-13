import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@decorators';
import { PageQueryDto } from '@dtos';
import { FeedService } from './feed.service';

@ApiTags('Feed')
@ApiBearerAuth()
@Controller({ path: 'feed', version: '1' })
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Upcoming events from my favourite categories' })
  feed(@CurrentUser('id') userId: string, @Query() query: PageQueryDto) {
    return this.feedService.feed(userId, query);
  }
}
