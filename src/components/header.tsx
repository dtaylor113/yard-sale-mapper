"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAdmin } from "@/lib/admin-context";
import { AdminLoginModal } from "./admin-login-modal";

// Admin entry point: hold Shift and click the logo 3 times in a row (within
// a couple seconds) to reveal the login prompt. This keeps the public UI
// clutter-free — regular visitors never see an "Admin" button at all.
const REQUIRED_SHIFT_CLICKS = 3;
const CLICK_WINDOW_MS = 2000;

export function Header() {
  const { isAdmin, logout } = useAdmin();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const shiftClickCount = useRef(0);
  const shiftClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLogoClick(e: React.MouseEvent) {
    if (!e.shiftKey) {
      shiftClickCount.current = 0;
      return;
    }

    shiftClickCount.current += 1;
    if (shiftClickTimer.current) clearTimeout(shiftClickTimer.current);
    shiftClickTimer.current = setTimeout(() => {
      shiftClickCount.current = 0;
    }, CLICK_WINDOW_MS);

    if (shiftClickCount.current >= REQUIRED_SHIFT_CLICKS) {
      shiftClickCount.current = 0;
      if (shiftClickTimer.current) clearTimeout(shiftClickTimer.current);
      if (!isAdmin) setIsLoginOpen(true);
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <button
            type="button"
            onClick={handleLogoClick}
            className="select-none text-2xl leading-none"
            title="Yard Sale Mapper"
            aria-label="Yard Sale Mapper home (Shift+click 3x for admin login)"
          >
            🧭
          </button>
          <span>Yard Sale Mapper</span>
        </Link>

        {isAdmin ? (
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              Admin mode
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>

      <AdminLoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </header>
  );
}
