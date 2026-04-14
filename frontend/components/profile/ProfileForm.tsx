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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <aside className="lg:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Public Preview</p>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {values.pfp ? (
              <img src={values.pfp} alt="profile" className="h-52 w-full object-cover" />
            ) : (
              <div className="flex h-52 w-full items-center justify-center text-sm font-semibold text-slate-500">
                Add profile image URL
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-lg font-extrabold tracking-tight text-slate-900">{values.name || 'Your Name'}</p>
            <p className="text-xs font-semibold text-slate-500">@{values.id || 'your-id'}</p>
            <p className="text-sm text-slate-600">{values.bio || 'Tell buyers about yourself and what you sell.'}</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Principal</p>
            <p className="mt-1 break-all text-xs text-slate-700">{principal ? principal.toString() : ''}</p>
          </div>
        </div>
      </aside>

      <div className="space-y-4 lg:col-span-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Basic Info</p>

          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">id (4 characters or more)</label>
              <div className="flex items-center rounded-xl border border-slate-300 px-3 py-2">
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">pfp url</label>
              <input
                value={values.pfp}
                onChange={handleChange('pfp')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">bio</label>
              <textarea
                value={values.bio}
                onChange={handleChange('bio')}
                rows={5}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            {props.profile && (
              <button
                type="button"
                disabled={progress}
                onClick={saveProfile}
                className="btn-modern-primary commerce-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {progress ? "Saving..." : "Save Profile"}
              </button>
            )}
            {!props.profile && (
              <button
                type="button"
                disabled={progress}
                onClick={createProfile}
                className="btn-modern-primary commerce-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {progress ? "Creating..." : "Create Profile"}
              </button>
            )}

            {props.profile && (
              <a
                href={"https://oneblock.page/" + props.profile.id}
                target={"_blank"}
                rel="noreferrer"
                className="btn-modern-secondary rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-orange-500 hover:text-orange-700"
              >
                Open Public Profile
              </a>
            )}
          </div>

          {message && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>}
        </div>
      </div>
    </div>
  )
}

export { ProfileForm }
