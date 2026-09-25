import { AlumniDbStore } from '../../../db/alumni-store';
import { ChapterEngine } from '../../operations/alumni/chapters/chapter-engine';

describe('Regional Chapter Governance & Member Directory Engine (Sprint-058 - ALUM-011)', () => {
  let store: AlumniDbStore;
  let engine: ChapterEngine;
  const instId = 'inst_campus_chap';

  beforeEach(() => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new ChapterEngine(store);
  });

  it('should create regional chapter, assign officers, and track membership growth', async () => {
    const chapter = await engine.createChapter({
      institutionId: instId,
      name: 'Dubai & Northern Emirates Alumni Chapter',
      code: 'CHAP-DXB',
      type: 'regional',
      country: 'United Arab Emirates',
      city: 'Dubai',
      description: 'Regional networking chapter for GCC alumni',
      presidentAlumniId: 'alum_pres_01',
      secretaryAlumniId: 'alum_sec_02',
    });

    expect(chapter.status).toBe('active');
    expect(chapter.memberCount).toBe(2);

    // Additional member joins
    await engine.joinChapter(chapter.id, 'alum_member_03', 'member');

    const updated = await engine.getChapterDetails(chapter.id, instId);
    expect(updated?.memberCount).toBe(3);
  });
});
