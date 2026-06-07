import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    if (!file) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    const groqForm = new FormData();
    groqForm.append('file', file, 'recording.webm');
    groqForm.append('model', 'whisper-large-v3');
    groqForm.append('language', 'en');
    groqForm.append('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: groqForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Whisper error:', err);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text ?? '' });
  } catch (err: any) {
    console.error('Transcribe error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
