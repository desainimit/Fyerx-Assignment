import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope, ApiError, Auth, CurrentUser } from '@decorators';
import { EventDto, PageQueryDto } from '@dtos';
import { FeedService } from './feed.service';

@ApiTags('Feed')
@Controller({ path: 'feed', version: '1' })
@Auth()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Upcoming events from my favourite categories' })
  @ApiEnvelope(EventDto, { paginated: true, message: 'My feed' })
  @ApiError(HttpStatus.BAD_REQUEST)
  feed(@CurrentUser('id') userId: string, @Query() query: PageQueryDto) {
    return this.feedService.feed(userId, query);
  }
}
