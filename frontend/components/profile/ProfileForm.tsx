import React, { useEffect, useState } from "react"
import { useOneblock, useGlobalContext } from "../Store";

interface State {
  id: string;
  name: string;
  pfp: string;
  bio: string;
}

const ProfileForm = (props) => {
  const oneblock = useOneblock();
  const { state: { principal } } = useGlobalContext();

  const [progress, setProgress] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [values, setValues] = React.useState<State>({
    id: '',
    name: '',
    pfp: '',
    bio: '',
  });

  useEffect(() => {
    if (props.profile) {
      setValues({
        id: props.profile.id,
        name: props.profile.name,
        pfp: props.profile.pfp,
        bio: props.profile.bio,
      })
    }
  }, [props.profile])

  const handleChange =
    (prop: keyof State) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues({ ...values, [prop]: event.target.value });
    };

  function createProfile() {
    setMessage(null)
    setProgress(true);
    oneblock.createProfile({
      id: values.id,
      name: values.name,
      pfp: values.pfp,
      bio: values.bio
    }).then(res => {
      setProgress(false)
      if (res["ok"]) {
        props.reload ? props.reload() : null;
      } else {
        setMessage(res["err"])
      }
    })
  };

  function saveProfile() {
    setMessage(null);
    setProgress(true)
    oneblock.updateProfile(values.id, {
      name: values.name,
      pfp: values.pfp,
      bio: values.bio
    }).then(res => {
      setProgress(false)
      if (res["err"]) {
        setMessage(res["err"])
      }
    })
  };

  return (
    <div className="space-y-3">
      {values.pfp && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img src={values.pfp} alt="profile" className="h-36 w-full object-cover" />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Your principal id</label>
          <input
            value={principal ? principal.toString() : ""}
            disabled
            className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">id (4 characters or more)</label>
          <div className="flex items-center rounded-md border border-slate-300 px-3 py-2">
            <span className="mr-1 text-slate-500">@</span>
            <input
              value={values.id}
              onChange={handleChange('id')}
              disabled={props.profile ? true : false}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">name</label>
          <input
            value={values.name}
            onChange={handleChange('name')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">pfp url</label>
          <input
            value={values.pfp}
            onChange={handleChange('pfp')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">bio</label>
          <textarea
            value={values.bio}
            onChange={handleChange('bio')}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          {props.profile && (
            <button
              type="button"
              disabled={progress}
              onClick={saveProfile}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {progress ? "Saving..." : "Save"}
            </button>
          )}
          {!props.profile && (
            <button
              type="button"
              disabled={progress}
              onClick={createProfile}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {progress ? "Creating..." : "Create"}
            </button>
          )}
          {props.profile && (
            <a
              href={"https://oneblock.page/" + props.profile.id}
              target={"_blank"}
              rel="noreferrer"
              className="text-sm font-semibold text-cyan-700 hover:underline"
            >
              Open
            </a>
          )}
        </div>

        {message && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>}
      </div>
    </div>
  )
}

export { ProfileForm }
