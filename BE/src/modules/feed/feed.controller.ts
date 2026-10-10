import { Controller } from '@nestjs/common';
import { FeedService } from './feed.service';

@Controller({ path: 'feed', version: '1' })
export class FeedController {
  constructor(private readonly feedService: FeedService) {}
}
