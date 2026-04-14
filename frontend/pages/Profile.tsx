import React, { useEffect, useState } from "react"


import { Profile } from "../api/profile/profile.did";

import { useGlobalContext, useOneblock } from "../components/Store";
import { ProfileForm } from "../components/profile/ProfileForm";

const ProfilePage = () => {

  const { state: {
    principal
  } } = useGlobalContext()

  const oneblock = useOneblock();

  const [profile, setProfile] = useState<Profile | null>();

  useEffect(() => {
    if (principal) loadProfile();
  }, [principal]);

  const loadProfile = () => {
    if (oneblock) {
      oneblock.getMyProfile().then(res => {
        console.log("profile:", res)
        if (res[0]) {
          setProfile(res[0]);
        };
      });
    }
  };

  return (
    <section className="space-y-4">
      <div className="glass-panel rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Account Center</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Manage your public seller identity, profile link, and storefront details for buyers.
        </p>
      </div>

      <div className="rounded-3xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur sm:p-6">
        <ProfileForm profile={profile} reload={loadProfile} />
      </div>
    </section>
    // <Card >
    //   {profile &&
    //     <CardMedia
    //       component="img"
    //       height="194"
    //       image={profile.pfp}
    //       alt="PFP"
    //     />
    //   }
    //   <CardContent>
    //     <Typography gutterBottom variant="h5" component="div">
    //       {profile ? profile.name : principal.toString()}
    //     </Typography>

    //     <Typography variant="body2" color="text.secondary">
    //       {profile ? profile.bio : ""}
    //     </Typography>
    //   </CardContent>

    // </Card>

  )
}

export { ProfilePage }
