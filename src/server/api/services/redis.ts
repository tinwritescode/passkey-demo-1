import Redis from "ioredis";
import { env } from "~/env";

class RedisService {
  private static instance: RedisService;

  public redis: Redis;

  private constructor() {
    this.redis = new Redis(env.REDIS_URL);
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }
}

const redisService = RedisService.getInstance();

export default redisService;
