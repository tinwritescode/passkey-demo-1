import { hash, compare } from "bcryptjs";

class PasswordHasher {
  hash(password: string) {
    return hash(password, 10);
  }

  compare(password: string, hashedPassword: string) {
    return compare(password, hashedPassword);
  }

  private static instance: PasswordHasher;

  static getInstance() {
    if (!PasswordHasher.instance) {
      PasswordHasher.instance = new PasswordHasher();
    }
    return PasswordHasher.instance;
  }
}

const passwordHasherService = PasswordHasher.getInstance();

export default passwordHasherService;
