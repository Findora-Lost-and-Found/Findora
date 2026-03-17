package com.findora.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.findora.service.MatchService;

@Component
public class MatchScheduler {

    private static final Logger log = LoggerFactory.getLogger(MatchScheduler.class);

    private final MatchService matchService;

    public MatchScheduler(MatchService matchService) {
        this.matchService = matchService;
    }

    @Scheduled(cron = "${app.matching.scheduler.cron:0 */30 * * * *}")
    public void runMatchingSweep() {
        int notifications = matchService.runScheduledMatchingSweep();
        if (notifications > 0) {
            log.info("match scheduler processed notifications={}", notifications);
        }
    }
}
