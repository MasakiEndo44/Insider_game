'use client';

/**
 * Join Room Dialog Component
 *
 * Implements Gemini's recommended Next.js 14 App Router best practices:
 * - Server Actions for form submission
 * - react-hook-form + Zod for validation
 * - useTransition for loading state
 * - Inline errors + Toast notifications (hybrid approach)
 * - Auto-correct nickname with -2 suffix on duplication
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
import { joinRoomAction } from '@/app/actions/roomActions';
import {
  RoomJoinFormSchema,
  type RoomJoinForm,
} from '@/lib/validations/database.schema';

export function JoinRoomDialog() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RoomJoinForm>({
    resolver: zodResolver(RoomJoinFormSchema),
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('passphrase', data.passphrase);
        formData.append('nickname', data.nickname);

        const result = await joinRoomAction(formData);

        if (!result.success) {
          // Handle field-specific errors
          if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) => {
              if (messages && messages.length > 0) {
                setError(field as keyof RoomJoinForm, {
                  message: messages[0],
                });
              }
            });
          }

          // Show general error toast (will be implemented with Zustand uiStore)
          console.error('Room join failed:', result.message);
        }
        // Success case: Server Action will redirect, no need to handle here
      } catch (error) {
        console.error('Unexpected error during room join:', error);
        setError('root', {
          message: '予期しないエラーが発生しました',
        });
      }
    });
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="flex-1">
          ルームを探す
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ルームに参加</DialogTitle>
          <DialogDescription>
            パスフレーズとニックネームを入力してルームに参加します
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-4">
          {/* Passphrase Field */}
          <div className="space-y-2">
            <Label htmlFor="join-passphrase">
              パスフレーズ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="join-passphrase"
              type="text"
              placeholder="ルームの合言葉を入力"
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
          </div>

          {/* Nickname Field */}
          <div className="space-y-2">
            <Label htmlFor="join-nickname">
              ニックネーム <span className="text-destructive">*</span>
            </Label>
            <Input
              id="join-nickname"
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
            <p className="text-xs text-muted-foreground">
              重複する場合は自動的に「-2」が付加されます
            </p>
          </div>

          {/* Root Error */}
          {errors.root && (
            <p className="text-sm text-destructive" role="alert">
              {errors.root.message}
            </p>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? '参加中...' : '参加'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
