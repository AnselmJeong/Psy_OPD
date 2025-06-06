import json


def calculate_sleep_latency(sleep_onset, disturbance_a):
    # sleep_onset: 잠드는 데 걸리는 시간 (분 단위), disturbance_a: 잠들기 어려움
    onset_score = 0
    sleep_onset = int(sleep_onset)
    if sleep_onset <= 15:
        onset_score = 0
    elif 16 <= sleep_onset <= 30:
        onset_score = 1
    elif 31 <= sleep_onset <= 60:
        onset_score = 2
    else:
        onset_score = 3

    total_latency = onset_score + int(disturbance_a)
    if total_latency == 0:
        return 0
    elif 1 <= total_latency <= 2:
        return 1
    elif 3 <= total_latency <= 4:
        return 2
    else:
        return 3


def calculate_sleep_efficiency(sleep_duration, goto_sleep, wakeup_time):
    # 수면 효율 = (수면 시간 / 침대에 있는 시간) * 100
    sleep_duration = float(sleep_duration)

    # Convert time strings in format 'HH:MM' to float hours
    def time_to_float(time_str):
        if isinstance(time_str, str) and ":" in time_str:
            hours, minutes = map(int, time_str.split(":"))
            return hours + minutes / 60.0
        return float(time_str)

    goto_sleep = time_to_float(goto_sleep)
    wakeup_time = time_to_float(wakeup_time)
    hours_in_bed = wakeup_time - goto_sleep
    if hours_in_bed <= 0:
        hours_in_bed += 24  # 다음 날 아침을 고려
    efficiency = (sleep_duration / hours_in_bed) * 100
    if efficiency >= 85:
        return 0
    elif 75 <= efficiency < 85:
        return 1
    elif 65 <= efficiency < 75:
        return 2
    else:
        return 3


def calculate_disturbance(disturbances):
    # 5b~5j 합계 계산
    total = sum(int(v) for v in disturbances.values())
    if total == 0:
        return 0
    elif 1 <= total <= 9:
        return 1
    elif 10 <= total <= 18:
        return 2
    else:
        return 3


def calculate_psqi_score(rating_result: dict):
    # C1: 주관적 수면의 질
    c1 = int(rating_result["sleep_quality"])

    # C2: 수면 잠복기
    c2 = calculate_sleep_latency(
        rating_result["sleep_onset"], rating_result["psqi_sleep_disturbances"]["a"]
    )

    # C3: 수면 시간
    c3 = 0
    sleep_hours = float(rating_result["sleep_duration"])
    if sleep_hours > 7:
        c3 = 0
    elif 6 <= sleep_hours <= 7:
        c3 = 1
    elif 5 <= sleep_hours < 6:
        c3 = 2
    else:
        c3 = 3

    # C4: 습관적 수면 효율
    c4 = calculate_sleep_efficiency(
        rating_result["sleep_duration"],
        rating_result["hour_to_goto_sleep"],
        rating_result["wakeup_time"],
    )

    # C5: 수면 장애
    c5 = calculate_disturbance(rating_result["psqi_sleep_disturbances"])

    # C6: 수면제 사용
    c6 = int(rating_result["sleep_medication"])

    # C7: 주간 기능 장애
    c7 = int(rating_result["daytime_dysfunction"]) + int(
        rating_result["daytime_motivation"]
    )
    if c7 == 0:
        c7 = 0
    elif 1 <= c7 <= 2:
        c7 = 1
    elif 3 <= c7 <= 4:
        c7 = 2
    else:
        c7 = 3

    # 총점 계산
    total_score = c1 + c2 + c3 + c4 + c5 + c6 + c7

    # 결과를 dictionary로 반환
    return {
        "total_score": total_score,
        "subscores": {
            "Subjective sleep quality": c1,
            "Sleep latency": c2,
            "Sleep duration": c3,
            "Habitual sleep efficiency": c4,
            "Sleep disturbance": c5,
            "Use of sleep medication": c6,
            "Daytime dysfunction": c7,
        },
    }


def evaluate_psqi(total_score):
    if total_score <= 5:
        return "좋은 수면"
    else:
        return "나쁜 수면"


def main():
    # JSON 데이터 예시
    json_data = {
        "hour_to_goto_sleep": 22,
        "sleep_onset": "0",
        "wakeup_time": 6,
        "sleep_duration": 6,
        "psqi_sleep_disturbances": {
            "a": 0,
            "b": 0,
            "c": 2,
            "d": 0,
            "e": 2,
            "f": 0,
            "g": 0,
            "h": 0,
            "i": 2,
            "j": 0,
        },
        "sleep_quality": 1,
        "sleep_medication": 1,
        "daytime_dysfunction": 0,
        "daytime_motivation": 0,
    }

    # 점수 계산
    psqi_result = calculate_psqi_score(json_data)
    evaluation = evaluate_psqi(psqi_result["total_score"])

    # 결과 출력
    print("PSQI 점수 결과:")
    print(f"총점: {psqi_result['total_score']}")
    print("구성요소별 점수:")
    for component, score in psqi_result["subscores"].items():
        print(f"  {component}: {score}")
    print(f"수면의 질 평가: {evaluation}")


if __name__ == "__main__":
    main()
