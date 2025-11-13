import React, { useEffect, useState } from "react"

import Box from '@mui/material/Box';

import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';

import { styled } from '@mui/material/styles';
import Button from "@mui/material/Button";

import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';

import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';

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

  const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  }));



  const linklist = links.map((link,index) =>
    <Box key={index}>
    <ListItem secondaryAction={
      <IconButton onClick={()=>deleteLink(link.name)} edge="end" aria-label="delete">
        <DeleteIcon />
      </IconButton>
    }>{link.name} - {link.url}</ListItem>
    <Divider/>
    </Box>
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

    <Box sx={{
      maxWidth: '100%'
    }}>

     <List>
        {linklist}
     </List>
      <Box p={5}>
        <Button variant="contained" onClick={handleClickOpen}>
          Add
        </Button>
      </Box>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>New Link</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="linkname"
            label="Name"
            fullWidth
            required
            variant="standard"
            onChange={handleChange('linkname')}
          />
          <TextField
            autoFocus
            margin="dense"
            id="url"
            label="URL"
            fullWidth
            required
            variant="standard"
            onChange={handleChange('linkurl')}
      
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={addLink} disabled={progress}>{progress ? <CircularProgress /> : "Add"} </Button>

        </DialogActions>
      </Dialog>
    </Box>

  )
}

export { LinkDialog }
