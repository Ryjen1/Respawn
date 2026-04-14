import { z } from "zod";
import rawProfile from "./business-profile.json" with { type: "json" };
import type { BusinessProfile } from "../types/index.js";

const serviceSchema = z.object({
  name: z.string().min(1),
  startingPrice: z.string().min(1),
  duration: z.string().min(1).optional(),
});

const faqSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  answer: z.string().min(1),
  cta: z.string().min(1).optional(),
});

const businessProfileSchema = z.object({
  businessName: z.string().min(1),
  ownerName: z.string().min(1),
  ownerTarget: z.string().min(1),
  approvedSenders: z.union([z.literal("*"), z.array(z.string().min(1))]),
  unknownSenderPolicy: z.enum(["reply-briefly", "ignore"]),
  handoffReply: z.string().min(1),
  fallbackReply: z.string().min(1),
  escalationKeywords: z.array(z.string().min(1)).min(1),
  services: z.array(serviceSchema),
  faqs: z.array(faqSchema).min(1),
});

export const businessProfile = businessProfileSchema.parse(rawProfile) as BusinessProfile;
