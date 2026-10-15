import React from 'react';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
  MoreHorizontal,
} from 'lucide-react';
import type { RedSocial } from '../../lib/db/types';

export type SocialPreviewProps = {
  network: RedSocial;
  authorName: string;
  authorInitials: string;
  content: string;
  imageUrl?: string | null;
  charLimit?: number;
};

function EngagementBar({ network }: { network: RedSocial }) {
  if (network === 'linkedin') {
    return (
      <>
        <div className="flex items-center justify-between text-xs text-[#666666] px-4 py-2 border-t border-[#e0e0e0]">
          <span className="flex items-center gap-1">
            <span className="inline-flex -space-x-1">
              <span className="w-4 h-4 rounded-full bg-[#0a66c2] text-white text-[8px] flex items-center justify-center">👍</span>
              <span className="w-4 h-4 rounded-full bg-[#df704d] text-white text-[8px] flex items-center justify-center">❤</span>
            </span>
            <span className="ml-1">245</span>
          </span>
          <span>18 comentarios · 32 compartidos</span>
        </div>
        <div className="flex border-t border-[#e0e0e0] text-[#666666] text-xs font-semibold">
          {[
            { Icon: ThumbsUp, label: 'Recomendar' },
            { Icon: MessageCircle, label: 'Comentar' },
            { Icon: Repeat2, label: 'Repetir' },
            { Icon: Send, label: 'Enviar' },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 hover:bg-[#f3f2ef] transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (network === 'instagram') {
    return (
      <>
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#efefef]">
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6" />
            <MessageCircle className="w-6 h-6" />
            <Send className="w-6 h-6" />
          </div>
          <Bookmark className="w-6 h-6" />
        </div>
        <div className="px-3 pb-2 text-sm font-semibold">245 Me gusta</div>
        <div className="px-3 pb-2 text-xs text-[#8e8e8e]">Ver los 18 comentarios</div>
      </>
    );
  }

  if (network === 'twitter') {
    return (
      <>
        <div className="flex items-center justify-between text-xs text-[#536471] px-3 py-2 border-t border-[#eff3f4]">
          <span>245 Me gusta</span>
          <span>18 respuestas · 32 reposts</span>
        </div>
        <div className="flex justify-around border-t border-[#eff3f4] text-[#536471] text-sm py-2">
          {['💬', '🔁', '❤️', '📤'].map((icon) => (
            <span key={icon} className="opacity-80">{icon}</span>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between text-xs text-[#65676b] px-3 py-1.5 border-t border-[#e4e6eb]">
        <span>👍 245</span>
        <span>18 comentarios · 12 compartidos</span>
      </div>
      <div className="flex border-t border-[#e4e6eb] text-[#65676b] text-sm font-semibold">
        {[
          { Icon: ThumbsUp, label: 'Me gusta' },
          { Icon: MessageCircle, label: 'Comentar' },
          { Icon: Share2, label: 'Compartir' },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            type="button"
            className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#f0f2f5] transition-colors"
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

export function SocialPostPreview({
  network,
  authorName,
  authorInitials,
  content,
  imageUrl,
  charLimit,
}: SocialPreviewProps) {
  const text = content.trim() || 'El texto de tu publicación aparecerá aquí…';

  if (network === 'instagram') {
    return (
      <div className="bg-white border border-[#dbdbdb] rounded-lg overflow-hidden max-w-sm mx-auto shadow-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[2px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#262626]">
                {authorInitials}
              </div>
            </div>
            <span className="text-sm font-semibold text-[#262626]">{authorName}</span>
          </div>
          <MoreHorizontal className="w-5 h-5 text-[#262626]" />
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square bg-[#fafafa] flex items-center justify-center text-xs text-[#8e8e8e]">
            Imagen
          </div>
        )}
        <EngagementBar network="instagram" />
        <div className="px-3 pb-3 text-sm">
          <span className="font-semibold mr-1">{authorName}</span>
          <span className="text-[#262626] whitespace-pre-wrap">{text}</span>
        </div>
        {charLimit != null && (
          <p className="px-3 pb-2 text-[11px] text-[#8e8e8e] text-right">
            {content.length} / {charLimit}
          </p>
        )}
      </div>
    );
  }

  if (network === 'twitter') {
    return (
      <div className="bg-white border border-[#eff3f4] rounded-2xl overflow-hidden shadow-sm max-w-md">
        <div className="flex gap-3 p-3">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">
            {authorInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-bold text-[#0f1419]">
              {authorName}
              <span className="text-[#536471] font-normal">@{authorName.replace(/\s+/g, '').toLowerCase()}</span>
            </div>
            <p className="text-[15px] text-[#0f1419] whitespace-pre-wrap mt-1">{text}</p>
            {imageUrl && <img src={imageUrl} alt="" className="mt-3 rounded-2xl border border-[#eff3f4] w-full max-h-80 object-cover" />}
            <EngagementBar network="twitter" />
          </div>
        </div>
        {charLimit != null && (
          <p className="px-3 pb-2 text-xs text-[#536471] text-right">{content.length} / {charLimit}</p>
        )}
      </div>
    );
  }

  if (network === 'facebook') {
    return (
      <div className="bg-white border border-[#dddfe2] rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-xs font-bold">
            {authorInitials}
          </div>
          <div>
            <div className="text-sm font-semibold text-[#050505]">{authorName}</div>
            <div className="text-xs text-[#65676b]">Ahora · 🌐</div>
          </div>
        </div>
        <p className="px-3 pb-3 text-[15px] text-[#050505] whitespace-pre-wrap leading-snug">{text}</p>
        {imageUrl && <img src={imageUrl} alt="" className="w-full max-h-80 object-cover" />}
        <EngagementBar network="facebook" />
        {charLimit != null && (
          <p className="px-3 py-2 text-xs text-[#65676b] text-right border-t border-[#e4e6eb]">
            {content.length} / {charLimit}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-start gap-2 p-3">
        <div className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {authorInitials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#000000e6]">{authorName}</div>
          <div className="text-xs text-[#00000099]">Creatividad e innovación · Influencer</div>
          <div className="text-xs text-[#00000099]">Ahora · 🌐</div>
        </div>
      </div>
      <p className="px-3 pb-3 text-sm text-[#000000e6] whitespace-pre-wrap leading-relaxed">{text}</p>
      {imageUrl && <img src={imageUrl} alt="" className="w-full max-h-96 object-cover" />}
      <EngagementBar network="linkedin" />
      {charLimit != null && (
        <p className="px-3 py-2 text-xs text-[#666666] text-right border-t border-[#e0e0e0]">
          {content.length} / {charLimit}
        </p>
      )}
    </div>
  );
}
