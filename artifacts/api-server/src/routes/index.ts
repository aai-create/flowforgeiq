import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stagesRouter from "./stages";
import suppliersRouter from "./suppliers";
import dealsRouter from "./deals";
import shipmentsRouter from "./shipments";
import messagesRouter from "./messages";
import tasksRouter from "./tasks";
import documentsRouter from "./documents";
import predictionsRouter from "./predictions";
import copilotRouter from "./copilot";
import webhooksRouter from "./webhooks";
import settingsRouter from "./settings";
import integrationsRouter from "./integrations";
import rfqsRouter from "./rfqs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stagesRouter);
router.use(suppliersRouter);
router.use(dealsRouter);
router.use(shipmentsRouter);
router.use(messagesRouter);
router.use(tasksRouter);
router.use(documentsRouter);
router.use(predictionsRouter);
router.use(copilotRouter);
router.use(webhooksRouter);
router.use(settingsRouter);
router.use(integrationsRouter);
router.use(rfqsRouter);

export default router;
