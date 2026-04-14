import * as React from 'react';
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Button, Chip } from '@mui/material';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import { Tooltip } from '@mui/material';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import Alert from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';

import CloseIcon from '@mui/icons-material/Close';

import { useGlobalContext, useEscrow } from '../Store';
import OfferList from './OfferList';
import { toast } from 'react-toastify';
import moment from 'moment';
import { CURRENCY_ICET, CURRENCY_ICP, LEDGER_E6S, LEDGER_E8S, ORDER_DEFAULT_EXPIRED_DAYS } from '../../lib/constants';
import { Link } from 'react-router-dom';



export default (props) => {

    const { state: {
        isAuthed,
        principal
    } } = useGlobalContext();
    const escrow = useEscrow();

    const [loading, setLoading] = React.useState(false);
    const currency = Object.getOwnPropertyNames(props.offer.currency)[0] == CURRENCY_ICP ? CURRENCY_ICP : CURRENCY_ICET;

    const price = currency == CURRENCY_ICP ? parseInt(props.offer.price) / LEDGER_E8S : parseInt(props.offer.price) / LEDGER_E6S;

    const buyit = () => {
        if (!isAuthed) {
            toast.warn("Plseae login first");

        } else {
            setLoading(true)
            escrow.create({
                seller: props.offer.owner,
                memo: props.offer.name,
                amount: props.offer.price,
                currency: props.offer.currency,
                expiration: BigInt(moment().add(ORDER_DEFAULT_EXPIRED_DAYS, "days").unix())
            }).then(res => {
                setLoading(false)
                if (res["ok"]) {
                    toast.success("Your order has been created, check your order list!")
                } else {
                    toast.error(res["err"] ? res["err"] : "check console log for error message")
                };
                props.close ? props.close() : null;
            });
        }
    };

    const unlist = () => {
        setLoading(true)
        escrow.changeItemStatus(props.offer.id, { "sold": null }).then(res => {
            if (res["ok"]) {
                toast.success("unlist this item")
            } else {
                toast.error(res["err"])
            };
            setLoading(false)

        })
    };

    return (
        <Card elevation={0}>
            <IconButton
                onClick={(e) => {
                    e.stopPropagation();
                    props.close?.();
                  }}
                sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    zIndex: 1
                }}
            >
                <CloseIcon />
            </IconButton>

            <CardHeader

                title={props.offer.name}
                subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                            ${currency} {price}
                        </Typography>
                        <Chip
                            label={Object.getOwnPropertyNames(props.offer.itype)[0]}
                            color="primary"
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                }
            />
            {props.offer.image && (
                <CardMedia
                    component="img"
                    sx={{
                        height: 300,
                        objectFit: 'contain',
                        bgcolor: 'grey.100',
                        borderRadius: 1
                    }}
                    image={props.offer.image}
                    alt={props.offer.name}
                />
            )}
            <CardContent>


                <Box sx={{ mb: 2 }}>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        {props.offer.description}
                    </Typography>
                    <Typography variant="caption" display="block">
                        Listed on: {moment.unix(Number(props.offer.listime) / 1000000000).format('MMMM DD, YYYY')}
                    </Typography>
                    <Typography variant="caption" display="block">
                        Owner:{" "}
                        <Link to={`/userid/${props.offer.owner.toString()}`}>
                            {props.offer.owner.toString()}
                        </Link>
                    </Typography>
                </Box>

            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', gap: 1, p: 2 }}>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <Button
                        variant="contained"
                        disabled={loading || !isAuthed}
                        onClick={buyit}
                        startIcon={<ShoppingCartIcon />}
                    >
                        Buy Now
                    </Button>
                )}

                {principal && props.offer.owner.toString() === principal.toString() && (
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={unlist}
                        startIcon={<FilterListOffIcon />}
                    >
                        Unlist Item
                    </Button>
                )}
            </CardActions>


        </Card>


    );
}