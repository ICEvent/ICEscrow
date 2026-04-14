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
        <div className="mt-8">
        {offer && <OfferDetail offer={offer}/>}
        </div>
    );
}