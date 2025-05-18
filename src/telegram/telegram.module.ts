import { NestjsGrammyModule } from "@grammyjs/nestjs";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AiService } from "src/services/ai.service";
import { TelegramService } from "./telegram.service";
import { TelegramUpdate } from "./telegram.update";

@Module({
  imports: [
    ConfigModule,
    NestjsGrammyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>("TELEGRAM_BOT_TOKEN"),
      }),
    }),
  ],
  providers: [TelegramUpdate, TelegramService, AiService],
})
export class TelegramModule {}
