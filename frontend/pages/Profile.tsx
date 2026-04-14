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

    <ProfileForm profile={profile} reload={loadProfile} />
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
