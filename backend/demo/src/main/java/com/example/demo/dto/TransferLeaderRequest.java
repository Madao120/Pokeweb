package com.example.demo.dto;

import lombok.Data;

@Data
public class TransferLeaderRequest {
    private Long currentLeaderId;
    private Long newLeaderId;
}
