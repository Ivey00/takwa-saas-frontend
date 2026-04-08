import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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
}

interface PredictResponse {
  emotion_class: string;        // 'positive' | 'negative'
  matched_emotion_ar: string;   // ex: 'خوف'
  matched_emotion_en: string;
  ayahs: AyahResult[];
  top_n: number;
}

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
  loading  = signal(false);
  error    = signal('');
  result   = signal<PredictResponse | null>(null);

  // Track which tafsir cards are expanded
  expandedTafsir = signal<Set<number>>(new Set());

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

    this.http.post<PredictResponse>(`${this.API_URL}/predict`, { text: this.userText })
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          const msg = err?.error?.detail ?? 'فشل الاتصال بالخادم. تأكد من تشغيل الـ API.';
          this.error.set(msg);
          this.loading.set(false);
        }
      });
  }

  toggleTafsir(index: number): void {
    const current = new Set(this.expandedTafsir());
    if (current.has(index)) {
      current.delete(index);
    } else {
      current.add(index);
    }
    this.expandedTafsir.set(current);
  }

  isTafsirExpanded(index: number): boolean {
    return this.expandedTafsir().has(index);
  }

  reset(): void {
    this.userText = '';
    this.result.set(null);
    this.error.set('');
    this.expandedTafsir.set(new Set());
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }
}
