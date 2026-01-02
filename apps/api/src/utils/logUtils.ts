import { Response ,Request} from "express";
import { logger } from "../api/middlewares/logger";

export const logUtils = (req:Request,res: Response,message:string) => {

        logger(req, res, () => {
          console.log('================================');
          console.log(` ${message}`);
          console.log('================================');
        });
};