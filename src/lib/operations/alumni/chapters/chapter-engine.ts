import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import {
  AlumniChapterItem,
  AlumniChapterMemberItem,
  ChapterType,
  ChapterRole,
} from '../types';

export interface CreateChapterInput {
  institutionId: string;
  name: string;
  code: string;
  type?: ChapterType;
  country: string;
  city: string;
  description?: string | null;
  presidentAlumniId?: string | null;
  secretaryAlumniId?: string | null;
  treasurerAlumniId?: string | null;
  bannerUrl?: string | null;
  foundedDate?: string | null;
}

export class ChapterEngine {
  private store: AlumniDbStore;

  constructor(store: AlumniDbStore = alumniStore) {
    this.store = store;
  }

  public async createChapter(input: CreateChapterInput): Promise<AlumniChapterItem> {
    const chapterId = `chap_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const chapter: AlumniChapterItem = {
      id: chapterId,
      institutionId: input.institutionId,
      name: input.name,
      code: input.code,
      type: input.type || 'regional',
      country: input.country,
      city: input.city,
      description: input.description,
      presidentAlumniId: input.presidentAlumniId,
      secretaryAlumniId: input.secretaryAlumniId,
      treasurerAlumniId: input.treasurerAlumniId,
      memberCount: 0,
      status: 'active',
      bannerUrl: input.bannerUrl,
      foundedDate: input.foundedDate || now.substring(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createChapter(chapter);

    // Auto-add officers as members if provided
    if (input.presidentAlumniId) {
      await this.joinChapter(chapterId, input.presidentAlumniId, 'president');
    }
    if (input.secretaryAlumniId && input.secretaryAlumniId !== input.presidentAlumniId) {
      await this.joinChapter(chapterId, input.secretaryAlumniId, 'secretary');
    }

    const saved = await this.store.getChapterById(chapterId, input.institutionId);
    return saved || chapter;
  }

  public async joinChapter(
    chapterId: string,
    alumniProfileId: string,
    role: ChapterRole = 'member'
  ): Promise<AlumniChapterMemberItem> {
    const memId = `mem_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const member: AlumniChapterMemberItem = {
      id: memId,
      chapterId,
      alumniProfileId,
      role,
      status: 'approved',
      joinedAt: now,
      createdAt: now,
    };

    await this.store.addChapterMember(member);
    return member;
  }

  public async listChapters(institutionId: string): Promise<AlumniChapterItem[]> {
    return this.store.listChapters(institutionId);
  }

  public async getChapterDetails(chapterId: string, institutionId: string): Promise<AlumniChapterItem | null> {
    return this.store.getChapterById(chapterId, institutionId);
  }
}

export const chapterEngine = new ChapterEngine();
