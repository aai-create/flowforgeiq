import { Router, type IRouter } from "express";
import { orgContextMiddleware, requireAuth } from "../middlewares/requireAuth";
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
import teamRouter from "./team";

const router: IRouter = Router();

router.use(orgContextMiddleware);

// Public / self-bootstrapping routes — no provisioned membership required
router.use(healthRouter);
router.use(webhooksRouter);
router.use(teamRouter); // handles its own auth (requireClerkAuth for provision-self, requireAuth for the rest)

// Protected routes — require a valid JWT AND a provisioned team_users row
const protectedRouter = Router();
protectedRouter.use(requireAuth);
protectedRouter.use(stagesRouter);
protectedRouter.use(suppliersRouter);
protectedRouter.use(dealsRouter);
protectedRouter.use(shipmentsRouter);
protectedRouter.use(messagesRouter);
protectedRouter.use(tasksRouter);
protectedRouter.use(documentsRouter);
protectedRouter.use(predictionsRouter);
protectedRouter.use(copilotRouter);
protectedRouter.use(settingsRouter);
protectedRouter.use(integrationsRouter);
protectedRouter.use(rfqsRouter);

router.use(protectedRouter);

export default router;
