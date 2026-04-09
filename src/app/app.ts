import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface ContextAyah {
  ayah_ar: string;
  ayah_en: string;
}

interface AyahResult {
  surah_name_ar: string;
  surah_name_roman: string;
  ayah_ar: string;
  ayah_en: string;
  tafsir: string;
  enhanced_emotion_ar: string;
  enhanced_emotion_en: string;
  similarity_score: number;
  relevance_score: number;
  prev_ayah: ContextAyah | null;
  next_ayah: ContextAyah | null;
}

interface PredictResponse {
  emotion_class: string;       // 'positive' | 'negative'
  matched_emotion_ar: string;
  matched_emotion_en: string;
  ayahs: AyahResult[];
  top_n: number;
}

type CardView = 'prev' | 'current' | 'next';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly API_URL = 'http://localhost:8000';

  userText = '';
  loading        = signal(false);
  error          = signal('');
  result         = signal<PredictResponse | null>(null);
  expandedTafsir = signal<Set<number>>(new Set());
  // Tracks which verse (prev / current / next) is displayed per card index
  cardView       = signal<Map<number, CardView>>(new Map());

  constructor(private http: HttpClient) {}

  get canSubmit(): boolean {
    return this.userText.trim().length >= 3 && !this.loading();
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.expandedTafsir.set(new Set());
    this.cardView.set(new Map());

    this.http.post<PredictResponse>(`${this.API_URL}/predict`, { text: this.userText })
      .subscribe({
        next: (res) => { this.result.set(res); this.loading.set(false); },
        error: (err) => {
          this.error.set(err?.error?.detail ?? 'فشل الاتصال بالخادم. تأكد من تشغيل الـ API.');
          this.loading.set(false);
        }
      });
  }

  reset(): void {
    this.userText = '';
    this.result.set(null);
    this.error.set('');
    this.expandedTafsir.set(new Set());
    this.cardView.set(new Map());
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  // ── Tafsir ──────────────────────────────────────────────────
  toggleTafsir(index: number): void {
    const s = new Set(this.expandedTafsir());
    s.has(index) ? s.delete(index) : s.add(index);
    this.expandedTafsir.set(s);
  }

  isTafsirExpanded(index: number): boolean {
    return this.expandedTafsir().has(index);
  }

  // ── Card navigation ─────────────────────────────────────────
  getView(index: number): CardView {
    return this.cardView().get(index) ?? 'current';
  }

  /** Navigate a card: direction -1 = go to previous verse, +1 = go to next verse */
  navigate(index: number, direction: -1 | 1): void {
    const current = this.getView(index);
    let next: CardView = 'current';
    if (direction === -1) {
      next = current === 'next' ? 'current' : 'prev';
    } else {
      next = current === 'prev' ? 'current' : 'next';
    }
    const m = new Map(this.cardView());
    m.set(index, next);
    this.cardView.set(m);
    // Collapse tafsir when navigating away from the selected verse
    if (next !== 'current') {
      const s = new Set(this.expandedTafsir());
      s.delete(index);
      this.expandedTafsir.set(s);
    }
  }

  canNavigate(ayah: AyahResult, index: number, direction: -1 | 1): boolean {
    const view = this.getView(index);
    if (direction === -1) {
      // Can go to previous: not already at 'prev', and prev exists when at 'current'
      return view !== 'prev' && !(view === 'current' && !ayah.prev_ayah);
    } else {
      // Can go to next: not already at 'next', and next exists when at 'current'
      return view !== 'next' && !(view === 'current' && !ayah.next_ayah);
    }
  }

  getDisplayed(ayah: AyahResult, index: number): ContextAyah {
    const view = this.getView(index);
    if (view === 'prev' && ayah.prev_ayah) return ayah.prev_ayah;
    if (view === 'next' && ayah.next_ayah) return ayah.next_ayah;
    return { ayah_ar: ayah.ayah_ar, ayah_en: ayah.ayah_en };
  }

  viewLabel(index: number): string {
    const view = this.getView(index);
    if (view === 'prev') return 'الآية السابقة';
    if (view === 'next') return 'الآية التالية';
    return 'الآية المختارة';
  }
}
