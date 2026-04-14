import React, { useState } from "react";
import { useEscrow, useGlobalContext, useLoading } from '../Store';
import { toast } from 'react-toastify';
export default (props) => {

    const { state: {
        principal
    } } = useGlobalContext();
    const escrow = useEscrow();
    const { setLoading } = useLoading();

    const [openCommentForm, setOpenCommentForm] = useState(false);

    const [comment, setComment] = useState<string | null>();

    const saveComment = () => {
        if (comment && props.id) {
            setLoading(true);
            escrow.comment(props.id, comment).then(res => {
                setLoading(false);
                if (res["ok"]) {
                    toast.success("saved comment");
                    props.reload ? props.reload() :null;
                } else {
                    toast.error(res["err"])
                };
            })
            setOpenCommentForm(false)
        }

    }
    return (
        <React.Fragment>
            <button
                type="button"
                onClick={() => setOpenCommentForm(true)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            >
                Comment
            </button>

            {openCommentForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenCommentForm(false)}>
                    <div className="w-full max-w-2xl rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="mb-3 text-lg font-semibold text-slate-900">Leave your comment</h3>
                        <textarea
                            defaultValue=""
                            className="min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                            onChange={e => setComment(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setOpenCommentForm(false)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!comment}
                                onClick={saveComment}
                                className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    )
}