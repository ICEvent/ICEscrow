import React, { useEffect, useState } from "react"

import { useOneblock } from "./Store";
import { Link } from "../api/profile/profile.did";

interface State {
  linkname: string;
  linkurl: string;
}


const LinkDialog = (props) => {

  
  const oneblock = useOneblock();

  const [links, setLinks] = useState(props.profile ? props.profile.links : [])
  const [progress, setProgress] = useState(false);

  const [open, setOpen] = React.useState(false);

  const [values, setValues] = React.useState<State>({
    linkname: '',
    linkurl: ''
  });

  const linklist = links.map((link,index) =>
    <div key={index} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="truncate text-slate-700">{link.name} - {link.url}</span>
      <button
        type="button"
        onClick={()=>deleteLink(link.name)}
        className="ml-3 rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
      >
        Delete
      </button>
    </div>
  )
  const handleChange =
    (prop: keyof State) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues({ ...values, [prop]: event.target.value });
    };



  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };



  function addLink() {
    try {
      const parsed = new URL(values.linkurl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        alert('Only http:// and https:// URLs are allowed.');
        return;
      }
    } catch {
      alert('Please enter a valid URL (e.g. https://example.com).');
      return;
    }
    setProgress(true)
    let link: Link =  {
      name: values.linkname,
      url: values.linkurl
    };
    oneblock.addLink(props.profile.id,link).then(res => {
      if (res["ok"]) {
        links.push(link);
        setOpen(false);
      };
      setProgress(false)
    });
  };

  function deleteLink(name){
    setProgress(true)
    oneblock.deleteLink(props.profile.id,name).then(res=>{
      if(res["ok"]){
        let flinks = links.filter(l=>l.name != name);
        setLinks(flinks);
      }else{
        console.log(res)
      }
      setProgress(false)
    });
  }
  return (
    <div className="max-w-full space-y-3">
      <div className="space-y-2">
        {linklist}
      </div>
      <div className="pt-2">
        <button
          type="button"
          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
          onClick={handleClickOpen}
        >
          Add
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
          <div className="w-full max-w-lg rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">New Link</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  id="linkname"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                  onChange={handleChange('linkname')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">URL</label>
                <input
                  id="url"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                  onChange={handleChange('linkurl')}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addLink}
                disabled={progress}
                className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {progress ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export { LinkDialog }
