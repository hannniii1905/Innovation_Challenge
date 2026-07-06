import { Box, Typography, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";

const stages = [

"Retrieving Singpass profile",

"Parsing Bank Statement",

"Analysing Income Statement",

"Retrieving Credit Bureau",

"Retrieving ACRA Profile",

"Litigation Screening",

"Blacklist Screening",

"Financial Ratio Analysis",

"Generating Credit Decision"

];

export default function Evaluating(){

    const [current,setCurrent]=useState(0);

    useEffect(()=>{

        const timer=setInterval(()=>{

            setCurrent(c=>{

                if(c===stages.length-1){

                    clearInterval(timer);

                    return c;

                }

                return c+1;

            });

        },1000);

        return ()=>clearInterval(timer);

    },[]);

    return(

        <Box
            sx={{
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                justifyContent:"center",
                height:"100vh"
            }}
        >

            <Typography variant="h4">

                Evaluating Application

            </Typography>

            <CircularProgress
                sx={{my:5}}
            />

            {stages.map((s,index)=>(

                <Typography
                    key={s}
                    color={
                        index<=current
                        ? "green"
                        : "gray"
                    }
                >

                    {index<current?"✓ ":""}

                    {s}

                </Typography>

            ))}

        </Box>

    );

}