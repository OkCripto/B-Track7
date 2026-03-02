import { query } from "./_generated/server";
import { v } from "convex/values";

export const list_public = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      version: v.string(),
      title: v.string(),
      description: v.string(),
      released_on: v.optional(v.string()),
      improvements: v.array(v.string()),
      fixes: v.array(v.string()),
      patches: v.array(v.string()),
      created_at: v.number(),
    })
  ),
  handler: async (ctx) => {
    const notes = await ctx.db.query("release_notes").collect();
    return notes
      .map((note) => ({
        id: String(note._id),
        version: note.version,
        title: note.title,
        description: note.description,
        released_on: note.released_on,
        improvements: note.improvements,
        fixes: note.fixes,
        patches: note.patches,
        created_at: note.created_at,
      }))
      .sort((left, right) => {
        const releasedComparison = (right.released_on ?? "").localeCompare(left.released_on ?? "");
        if (releasedComparison !== 0) return releasedComparison;
        return right.created_at - left.created_at;
      });
  },
});
