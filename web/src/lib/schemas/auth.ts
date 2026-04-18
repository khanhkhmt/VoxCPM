import { z } from "zod";

// --- Password rules: 8-72 chars, at least 1 upper, 1 lower, 1 digit ---
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit");

// --- Login ---
export const loginSchema = z.object({
    username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
    password: z.string().min(1, "Mật khẩu không được để trống"),
    captchaId: z.string().min(1, "Captcha ID is required"),
    captchaText: z.string().min(1, "Please enter the captcha"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// --- Register ---
export const registerSchema = z
    .object({
        name: z
            .string()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name must be at most 100 characters"),
        username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
        password: passwordSchema,
        confirmPassword: z.string(),
        captchaId: z.string().min(1, "Captcha ID is required"),
        captchaText: z.string().min(1, "Please enter the captcha"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type RegisterInput = z.infer<typeof registerSchema>;

// --- Change Password ---
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordSchema,
        confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords do not match",
        path: ["confirmNewPassword"],
    });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
