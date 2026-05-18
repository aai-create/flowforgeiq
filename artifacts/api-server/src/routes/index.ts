import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stagesRouter from "./stages";
import suppliersRouter from "./suppliers";
import shipmentsRouter from "./shipments";
import messagesRouter from "./messages";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stagesRouter);
router.use(suppliersRouter);
router.use(shipmentsRouter);
router.use(messagesRouter);
router.use(tasksRouter);

export default router;
