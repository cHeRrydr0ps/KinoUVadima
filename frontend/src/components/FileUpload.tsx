import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileUploadProps {
  label: string;
  accept: string;           // сохраняем проп, но не используем в URL-режиме
  currentValue?: string;
  onChange: (value: string) => void;
  uploadType: 'poster' | 'trailer';
  placeholder?: string;
}

/**
 * URL-only режим загрузки: никаких вызовов /api/upload(-url).
 * Просто вводим/вставляем публичный URL (S3/CloudFront/и т.п.).
 */
export function FileUpload({ label, currentValue, onChange, placeholder }: FileUploadProps) {
  const [urlValue, setUrlValue] = useState(currentValue || '');

  useEffect(() => {
    setUrlValue(currentValue || '');
  }, [currentValue]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-200">{label}</Label>

      <div className="flex items-center gap-2">
        <Input
          placeholder={placeholder || 'https://...'}
          value={urlValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setUrlValue(newValue);
            onChange(newValue);
          }}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => { onChange(''); setUrlValue(''); }}
          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          title="Очистить"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-xs text-gray-400 flex items-center gap-2">
        <FileText className="w-3 h-3" /> Вставьте публичный URL (S3/CloudFront и т.п.).
      </div>
    </div>
  );
}
