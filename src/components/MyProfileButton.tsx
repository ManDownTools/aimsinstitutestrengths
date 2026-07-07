"use client";

import { useState } from "react";
import EditProfileModal from "./EditProfileModal";

export default function MyProfileButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost sm"
        onClick={() => setOpen(true)}
      >
        My profile
      </button>
      {open && (
        <EditProfileModal
          personId={userId}
          hideRoleField={true}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
