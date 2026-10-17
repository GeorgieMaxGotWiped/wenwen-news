"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { updateProfileAction } from "@/lib/actions";

type ProfileUser = {
  name: string;
  email: string;
  bio: string;
  avatar: string | null;
};

export default function ProfileForm({ user }: { user: ProfileUser }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, {});
  const [preview, setPreview] = useState<string | null>(user.avatar);
  const [name, setName] = useState(user.name);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) window.dispatchEvent(new Event("account:refresh"));
  }, [state]);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) return;
      const scale = Math.max(size / bitmap.width, size / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
      if (!blob) return;
      const resized = new File([blob], "avatar.webp", { type: "image/webp" });
      const transfer = new DataTransfer();
      transfer.items.add(resized);
      if (fileRef.current) fileRef.current.files = transfer.files;
      setPreview(URL.createObjectURL(blob));
    } catch {
      // 浏览器无法处理时保留原文件，交给服务端校验
    }
  };

  return (
    <form action={formAction} className="form profile-form">
      {state.ok ? <p className="alert alert-ok">资料已更新。</p> : null}
      {state.error ? <p className="alert alert-error">{state.error}</p> : null}

      <div className="profile-avatar-row">
        <UserAvatar name={name || user.name} avatar={preview} size={72} />
        <div className="field">
          <label htmlFor="profile-avatar">头像</label>
          <input
            ref={fileRef}
            id="profile-avatar"
            className="input-file"
            type="file"
            name="avatar"
            accept="image/*"
            onChange={onPick}
          />
          {user.avatar ? (
            <label className="check-row">
              <input
                type="checkbox"
                name="removeAvatar"
                onChange={(event) => {
                  if (event.target.checked) setPreview(null);
                  else setPreview(user.avatar);
                }}
              />
              移除当前头像
            </label>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="profile-name">昵称</label>
        <input
          id="profile-name"
          className="input"
          name="name"
          maxLength={24}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="profile-bio">简介</label>
        <textarea
          id="profile-bio"
          className="textarea textarea-sm"
          name="bio"
          maxLength={120}
          defaultValue={user.bio}
          placeholder="一句话介绍自己"
        />
      </div>

      <div className="field">
        <label htmlFor="profile-email">邮箱</label>
        <input id="profile-email" className="input" value={user.email} disabled />
        <span className="hint">邮箱暂不可修改。</span>
      </div>

      <div className="profile-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存资料"}
        </button>
      </div>
    </form>
  );
}
