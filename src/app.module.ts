import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoansModule } from './loans/loans.module';

@Module({
  imports: [LoansModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
