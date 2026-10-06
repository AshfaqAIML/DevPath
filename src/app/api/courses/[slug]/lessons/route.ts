import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

const blockSchema = z.object({
  t: z.enum(["h", "p", "list", "callout", "code", "table", "diagram", "keytakeaways", "interview"]),
});

const exerciseSchema = z.object({
  prompt: z.string().min(1).max(2000),
  hints: z.array(z.string().max(1000)).max(5),
  solution: z.string().max(6000),
  why: z.string().max(3000),
  code: z.string().max(6000).optional(),
  lang: z.string().max(20).optional(),
});

const quizQuestionSchema = z.object({
  q: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(300)).min(2).max(6),
  answer: z.number().int().min(0),
  explain: z.string().min(1).max(1500),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

const lessonCreateSchema = z.object({
  title: z.string().min(2).max(160),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case slug required")
    .max(120)
    .optional(),
  objective: z.string().max(500).optional(),
  why: z.string().max(1200).optional(),
  minutes: z.number().int().min(1).max(240).optional(),
  xp: z.number().int().min(0).max(1000).optional(),
  blocks: z.array(blockSchema.passthrough()).max(80).optional(),
  exercise: exerciseSchema.optional().nullable(),
  quiz: z.array(quizQuestionSchema).max(10).optional(),
  summary: z.string().max(2000).optional(),
  next: z.string().max(1000).optional(),
  published: z.boolean().optional(),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// POST /api/courses/[slug]/lessons — admin creates a lesson (appended last).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { slug } = await params;
    const course = await db.course.findUnique({ where: { courseSlug: slug } });
    if (!course) {
      // Auto-create the Course shell so lesson authoring can start immediately
      const item = await db.resourceItem.findUnique({ where: { slug } });
      if (!item) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }
      await db.course.create({ data: { courseSlug: slug } });
    }
    const body = lessonCreateSchema.parse(await req.json());

    const maxOrder = await db.lesson.aggregate({
      where: { courseSlug: slug },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? 0) + 1;

    let lessonSlug = body.slug ?? slugify(body.title);
    const clash = await db.lesson.findUnique({
      where: { courseSlug_slug: { courseSlug: slug, slug: lessonSlug } },
    });
    if (clash) lessonSlug = `${lessonSlug}-${order}`;

    const lesson = await db.lesson.create({
      data: {
        courseSlug: slug,
        order,
        slug: lessonSlug,
        title: body.title,
        objective: body.objective ?? "",
        why: body.why ?? "",
        minutes: body.minutes ?? 15,
        xp: body.xp ?? 50,
        blocks: JSON.stringify(body.blocks ?? []),
        exercise: body.exercise ? JSON.stringify(body.exercise) : null,
        quiz: JSON.stringify(body.quiz ?? []),
        summary: body.summary ?? "",
        next: body.next ?? "",
        published: body.published ?? false,
      },
    });
    return NextResponse.json({ lesson: { id: lesson.id, order: lesson.order } }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create lesson", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
