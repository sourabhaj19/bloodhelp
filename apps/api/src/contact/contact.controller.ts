import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/contact.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit contact form (mails support + confirmation)' })
  async submit(@Body() dto: CreateContactDto) {
    const data = await this.contact.submit(dto);
    return { success: true, data, message: 'Message received. We will get back to you soon.' };
  }
}
