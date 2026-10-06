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

const lessonPatchSchema = z.object({
  title: z.string().min(2).max(160).optional(),
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
  /** Swap with the neighbor (admin reorder UI) */
  move: z.enum(["up", "down"]).optional(),
});

// PATCH /api/lessons/[id] — admin updates a lesson (content fields, publish
// state, or move up/down among siblings).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.lesson.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    const body = lessonPatchSchema.parse(await req.json());

    // Reorder: swap with the neighbor via a temporary slot (avoids the
    // (courseSlug, order) unique constraint).
    if (body.move) {
      const neighbor = await db.lesson.findFirst({
        where: {
          courseSlug: existing.courseSlug,
          order: body.move === "up" ? existing.order - 1 : existing.order + 1,
        },
      });
      if (!neighbor) {
        return NextResponse.json({ error: "No neighbor to swap with" }, { status: 400 });
      }
      const a = existing.order;
      const b = neighbor.order;
      await db.lesson.update({ where: { id: existing.id }, data: { order: -1 } });
      await db.lesson.update({ where: { id: neighbor.id }, data: { order: a } });
      await db.lesson.update({ where: { id: existing.id }, data: { order: b } });
      return NextResponse.json({ ok: true, order: b });
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.objective !== undefined) data.objective = body.objective;
    if (body.why !== undefined) data.why = body.why;
    if (body.minutes !== undefined) data.minutes = body.minutes;
    if (body.xp !== undefined) data.xp = body.xp;
    if (body.blocks !== undefined) data.blocks = JSON.stringify(body.blocks);
    if (body.exercise !== undefined)
      data.exercise = body.exercise ? JSON.stringify(body.exercise) : null;
    if (body.quiz !== undefined) data.quiz = JSON.stringify(body.quiz);
    if (body.summary !== undefined) data.summary = body.summary;
    if (body.next !== undefined) data.next = body.next;
    if (body.published !== undefined) data.published = body.published;

    await db.lesson.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update lesson", detail: (e as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/lessons/[id] — admin removes a lesson; remaining lessons are
// renumbered to keep orders contiguous.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.lesson.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    await db.lesson.delete({ where: { id } });
    // Renumber siblings above the removed slot
    const later = await db.lesson.findMany({
      where: { courseSlug: existing.courseSlug, order: { gt: existing.order } },
      orderBy: { order: "asc" },
    });
    let order = existing.order;
    for (const l of later) {
      await db.lesson.update({ where: { id: l.id }, data: { order } });
      order++;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to delete lesson", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
