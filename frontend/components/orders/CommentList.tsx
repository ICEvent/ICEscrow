import * as React from 'react';
import moment from 'moment';

import { useGlobalContext } from '../Store';


export default function Comments(props) {
    const {state:{
        principal
    }} = useGlobalContext();

    const [comments, setComments] = React.useState([]);
    React.useEffect(()=>{
        setComments(props.comments);
    },[props.comments])
    
    const cl = comments.map(c =>
        <div key={c.ctime} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">
                    {c.user.toString() == principal.toString() ? "(you)" : c.user.toString().slice(0, 5) + "..." + c.user.toString().slice(-5)}
                </span>
                <span className="text-xs text-slate-500">
                    {moment.unix(parseInt(c.ctime) / 1000000000).format("YYYY-MM-DD hh:mm")}
                </span>
            </div>
            <p className="text-sm text-slate-700">{c.comment}</p>
        </div>
    );

    return (
        <div className="mt-4 space-y-2">
            {cl}
        </div>

    );
}