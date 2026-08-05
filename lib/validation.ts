import { z } from "zod";

const emailCheck = z.string().trim().email();

const songwriterSchema = z.object({
  legalName: z.string().trim().min(2, "Legal name is required."),
  professionalName: z.string().trim().optional().default(""),
  email: z.string().trim().email("Enter a valid email address."),
  address: z.string().trim().min(4, "Address is required."),
  ipiCae: z.string().trim().optional().default(""),
  pro: z.string().trim().optional().default(""),
  publisher: z.string().trim().optional().default(""),
  contribution: z.string().trim().min(2, "Contribution is required."),
  compositionPercent: z.coerce.number().min(0).max(100),
});

const masterOwnerSchema = z.object({
  ownerName: z.string().trim().min(2, "Master owner name is required."),
  ownershipPercent: z.coerce.number().min(0).max(100),
  isrc: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  linkedSongwriterPosition: z.coerce.number().int().min(1).max(4).nullable().optional().default(null),
});

export const agreementSchema = z
  .object({
    songTitle: z.string().trim().min(1, "Song title is required."),
    releaseName: z.string().trim().optional().default(""),
    artistName: z.string().trim().min(1, "Primary artist is required."),
    effectiveDate: z.string().min(1, "Effective date is required."),
    governingState: z.string().trim().min(2, "Governing state is required."),
    songwriters: z.array(songwriterSchema).min(2).max(4),
    masterOwners: z.array(masterOwnerSchema).min(1).max(4),
  })
  .superRefine((data, ctx) => {
    const compositionTotal = data.songwriters.reduce((sum, w) => sum + Number(w.compositionPercent), 0);
    if (Math.abs(compositionTotal - 100) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["songwriters"],
        message: `Composition splits must total 100%. Current total: ${compositionTotal}%.`,
      });
    }

    const masterTotal = data.masterOwners.reduce((sum, m) => sum + Number(m.ownershipPercent), 0);
    if (Math.abs(masterTotal - 100) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["masterOwners"],
        message: `Master ownership must total 100%. Current total: ${masterTotal}%.`,
      });
    }

    data.masterOwners.forEach((owner, index) => {
      const linkedPosition = owner.linkedSongwriterPosition || null;
      if (linkedPosition && linkedPosition > data.songwriters.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["masterOwners", index, "linkedSongwriterPosition"],
          message: "Linked songwriter must exist in this agreement.",
        });
      }

      if (!linkedPosition) {
        const email = owner.email?.trim() || "";
        const address = owner.address?.trim() || "";
        if (!emailCheck.safeParse(email).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["masterOwners", index, "email"],
            message: "Master owner email is required when they are a separate signer.",
          });
        }
        if (address.length < 4) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["masterOwners", index, "address"],
            message: "Master owner mailing address is required when they are a separate signer.",
          });
        }
      }
    });
  });

export const signatureSchema = z.object({
  signedName: z.string().trim().min(2, "Type your full legal name."),
  signatureData: z.string().startsWith("data:image/png;base64,", "A drawn signature is required."),
  accepted: z.literal(true, { errorMap: () => ({ message: "You must accept the agreement." }) }),
});
