<x-mail::message>
# {{ $copy['title'] }}

{{ $copy['greeting'] }}

{{ $copy['intro'] }}

- **{{ $copy['loan_code'] }}:** {{ $borrowing->loan_id }}
- **{{ $copy['book'] }}:** {{ $borrowing->book->title }}
- **{{ $copy['borrow_date'] }}:** {{ $borrowing->borrow_date->format('d/m/Y') }}
- **{{ $copy['due_date'] }}:** {{ $borrowing->due_date->format('d/m/Y') }}

{{ $copy['instruction'] }}
{{ $copy['extension'] }}

{{ $copy['thank_you'] }}
{{ $copy['signature'] }}
</x-mail::message>
