import { describe, it, expect } from "vitest";
import { User } from "./User";
import { InvalidEmailError } from "../errors/InvalidEmailError";

describe("User Entity", () => {
  it("should create a valid user", () => {
    const user = User.create({
      id: "user-123",
      email: "test@example.com",
      roles: ["admin"],
      mfaEnabled: true
    });

    expect(user.id).toBe("user-123");
    expect(user.email).toBe("test@example.com");
    expect(user.roles).toContain("admin");
    expect(user.mfaEnabled).toBe(true);
  });

  it("should normalize email to lowercase", () => {
    const user = User.create({
      id: "user-123",
      email: "TEST@EXAMPLE.COM",
      roles: [],
      mfaEnabled: false
    });
    expect(user.email).toBe("test@example.com");
  });

  it("should throw error for invalid email", () => {
    expect(() => User.create({
      id: "user-123",
      email: "invalid-email",
      roles: [],
      mfaEnabled: false
    })).toThrow(InvalidEmailError);
  });

  it("should throw error if ID is empty", () => {
    expect(() => User.create({
      id: "",
      email: "test@example.com",
      roles: [],
      mfaEnabled: false
    })).toThrowError("ID do utilizador é obrigatório.");
  });
});
