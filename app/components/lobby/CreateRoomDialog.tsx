'use client';

/**
 * Create Room Dialog Component
 *
 * Implements Gemini's recommended Next.js 14 App Router best practices:
 * - Server Actions for form submission
 * - react-hook-form + Zod for validation
 * - useTransition for loading state
 * - Inline errors + Toast notifications (hybrid approach)
 */

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createRoomAction } from '@/app/actions/roomActions';
import {
  RoomCreationFormSchema,
  type RoomCreationForm,
} from '@/lib/validations/database.schema';

export function CreateRoomDialog() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RoomCreationForm>({
    resolver: zodResolver(RoomCreationFormSchema),
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('passphrase', data.passphrase);
        formData.append('nickname', data.nickname);

        const result = await createRoomAction(formData);

        if (!result.success) {
          // Handle field-specific errors
          if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) => {
              if (messages && messages.length > 0) {
                setError(field as keyof RoomCreationForm, {
                  message: messages[0],
                });
              }
            });
          }

          // Show general error toast (will be implemented with Zustand uiStore)
          console.error('Room creation failed:', result.message);
        }
        // Success case: Server Action will redirect, no need to handle here
      } catch (error) {
        console.error('Unexpected error during room creation:', error);
        setError('root', {
          message: '予期しないエラーが発生しました',
        });
      }
    });
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="flex-1">
          ルームを作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しいルームを作成</DialogTitle>
          <DialogDescription>
            パスフレーズとニックネームを設定してゲームルームを作成します
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-4">
          {/* Passphrase Field */}
          <div className="space-y-2">
            <Label htmlFor="passphrase">
              パスフレーズ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="passphrase"
              type="text"
              placeholder="3〜10文字（日本語可）"
              {...register('passphrase')}
              disabled={isPending}
              aria-invalid={errors.passphrase ? 'true' : 'false'}
              aria-describedby={
                errors.passphrase ? 'passphrase-error' : undefined
              }
            />
            {errors.passphrase && (
              <p
                id="passphrase-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.passphrase.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              他のプレイヤーと共有する合言葉です
            </p>
          </div>

          {/* Nickname Field */}
          <div className="space-y-2">
            <Label htmlFor="nickname">
              ニックネーム <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nickname"
              type="text"
              placeholder="表示名（20文字以内）"
              {...register('nickname')}
              disabled={isPending}
              aria-invalid={errors.nickname ? 'true' : 'false'}
              aria-describedby={errors.nickname ? 'nickname-error' : undefined}
            />
            {errors.nickname && (
              <p
                id="nickname-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.nickname.message}
              </p>
            )}
          </div>

          {/* Root Error */}
          {errors.root && (
            <p className="text-sm text-destructive" role="alert">
              {errors.root.message}
            </p>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '作成中...' : '作成'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
