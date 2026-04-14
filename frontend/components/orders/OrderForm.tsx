import * as React from 'react';
import { Principal } from '@dfinity/principal';
import moment from 'moment';

import { CURRENCY_ICET, CURRENCY_ICP, LEDGER_E6S, LEDGER_E8S, ORDER_DEFAULT_EXPIRED_DAYS } from '../../lib/constants';
import { useGlobalContext } from '../Store';

export default (props) => {


    const { state: {
        principal
    } } = useGlobalContext()
    // const [openOrder, setOpenOrder] = React.useState(false)
    // const currency = Object.getOwnPropertyNames(props.order.currency)[0];
    // let es = currency == "ICP" ? 100000000 : 1000000;

    const [state, setState] = React.useState({
        item: "",
        yourside: "buyer",
        buyer: principal.toText(),
        seller: "",
        amount: 0,
        currency: CURRENCY_ICP,


    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        let name = e.target.name;
        let value = e.target.value;
        console.log(e.target.name)
        console.log(e.target.value)

        if (name == "yourside") {
            if (value == "buyer") {
                setState({ ...state, "yourside": value, "buyer": principal.toText(), "seller": "" });
            } else {
                setState({ ...state, "yourside": value, "seller": principal.toText(), "buyer": "" });
            }
        } else {
            <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p className="mb-3">
                        Create a custom order to guard your fund with your buyer/seller in escrow smart contract. (e.g. house rental deposit, sale deposit...)
                    </p>
                    <div className="grid gap-2 text-xs sm:grid-cols-4">
                        <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Deposit Fund in Escrow</div>
                        <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Seller Deliver Item</div>
                        <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Buyer Receive Item</div>
                        <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Release Fund to Seller</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-12">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Describe your ordering item</label>
                        <input
                            name="item"
                            value={state.item}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                        />
                    </div>

                    <div className="sm:col-span-4">
                        <p className="mb-1 text-sm font-medium text-slate-700">Are you?</p>
                        <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" name="yourside" value="buyer" checked={state.yourside == "buyer"} onChange={handleChange} />
                                Buyer
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" name="yourside" value="seller" checked={state.yourside == "seller"} onChange={handleChange} />
                                Seller
                            </label>
                        </div>
                    </div>

                    {state.yourside == "seller" && (
                        <div className="sm:col-span-8">
                            <label className="mb-1 block text-sm font-medium text-slate-700">the principal of buyer</label>
                            <input
                                name="buyer"
                                value={state.buyer}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                            />
                        </div>
                    )}

                    {state.yourside == "buyer" && (
                        <div className="sm:col-span-8">
                            <label className="mb-1 block text-sm font-medium text-slate-700">the principal of seller</label>
                            <input
                                name="seller"
                                value={state.seller}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                            />
                        </div>
                    )}

                    <div className="sm:col-span-6">
                        <label className="mb-1 block text-sm font-medium text-slate-700">the amount of order</label>
                        <input
                            name="amount"
                            type="number"
                            value={state.amount}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                        <select
                            name="currency"
                            value={state.currency}
                            onChange={(e) => handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                        >
                            <option value={CURRENCY_ICP}>{CURRENCY_ICP}</option>
                            <option value={CURRENCY_ICET}>{CURRENCY_ICET}</option>
                            <option disabled>USDT</option>
                            <option disabled>USDC</option>
                            <option disabled>BTC</option>
                            <option disabled>ETH</option>
                        </select>
                    </div>

                    <div className="sm:col-span-12">
                        <button
                            type="button"
                            onClick={createOrder}
                            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </div>
                    autoFocus
                    margin="dense"
                    name="amount"
                    label="the amount of order"
                    fullWidth
                    variant="standard"
                    onChange={handleChange}
                    value={state.amount}
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                    <InputLabel id="demo-simple-select-label">Currency</InputLabel>
                    <Select
                        labelId="demo-simple-select-label"
                        name="currency"
                        value={state.currency}
                        label="Currency"
                        onChange={handleChange}
                    >
                        <MenuItem selected={state.currency == CURRENCY_ICP} value={CURRENCY_ICP}>{CURRENCY_ICP}</MenuItem>
                        <MenuItem selected={state.currency == CURRENCY_ICET} value={CURRENCY_ICET}>{CURRENCY_ICET}</MenuItem>
                        <MenuItem disabled>USDT</MenuItem>
                        <MenuItem disabled>USDC</MenuItem>
                        <MenuItem disabled>BTC</MenuItem>
                        <MenuItem disabled>ETH</MenuItem>


                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12}>
                <Button variant='contained' onClick={createOrder}>Create</Button>
            </Grid>
        </Grid>
    )
}