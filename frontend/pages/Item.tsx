import * as React from 'react';

import { useParams } from "react-router-dom";
import { useEscrow } from '../components/Store';
import OfferDetail from '../components/offers/OfferDetail';
import { Item } from 'frontend/api/escrow/escrow.did';



export default (props) => {
    const escrow = useEscrow();
    const params =  useParams();

    const [offer, setOffer] = React.useState<Item|null>();

    React.useEffect(()=>{
        escrow.getItem(BigInt(params.id)).then(res=>{
            setOffer(res[0]);
        }); 
    },[])
  
    return (
        <div className="mt-4 rounded-3xl border border-white/50 bg-white/75 p-4 shadow-sm backdrop-blur sm:p-5">
            {offer && <OfferDetail offer={offer} />}
        </div>
    );
}