import { sign, verify } from "jsonwebtoken";
import { env } from "~/env";

export type JWTTokenPayload = {
  userId: string;
  email: string;
  username: string;
};

class JWTService {
  private static instance: JWTService;

  private constructor() {}

  static getInstance() {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  #sign(payload: any) {
    return sign(payload, env.JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  verify(token: string) {
    return verify(token, env.JWT_SECRET);
  }

  createAccessToken(payload: JWTTokenPayload) {
    return this.#sign(payload);
  }

  decodeAccessToken(token: string) {
    return this.verify(token) as JWTTokenPayload;
  }
}

const jwtService = JWTService.getInstance();

export default jwtService;
