import { useRef, useState } from "react";
import { Link } from "react-router-dom";
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
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        {/* NOTE: the logo button is a sibling of the <Link>, not nested inside
            it — an <a> containing a <button> is invalid HTML. */}
        <div className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-ink">
          <button
            type="button"
            onClick={handleLogoClick}
            className="select-none text-2xl leading-none"
            title="Yard Sale Mapper"
            aria-label="Yard Sale Mapper home (Shift+click 3x for admin login)"
          >
            🧭
          </button>
          <Link to="/" className="transition-colors duration-150 hover:text-accent">
            Yard Sale Mapper
          </Link>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-3">
            <span className="chip chip-caution">Admin mode</span>
            <button type="button" onClick={logout} className="btn btn-secondary btn-sm">
              Log out
            </button>
          </div>
        ) : null}
      </div>

      <AdminLoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </header>
  );
}
